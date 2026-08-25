import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ApplicationError } from '../../common/errors/application-error';
import { User } from '../auth/entities/user.entity';
import {
  OrganizationMember,
  type OrganizationMemberRole,
} from './entities/organization-member.entity';
import { Organization } from './entities/organization.entity';
import { assertCan } from './organization-permissions';

export interface OrganizationView {
  id: string;
  name: string;
  slug: string | null;
  role: OrganizationMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string | null;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string | null;
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly members: Repository<OrganizationMember>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(
    userId: string,
    input: CreateOrganizationInput,
  ): Promise<OrganizationView> {
    const name = input.name.trim();
    if (!name) {
      throw new ApplicationError(
        'INVALID_ORGANIZATION',
        'Organization name is required.',
      );
    }
    if (name.length > 120) {
      throw new ApplicationError(
        'INVALID_ORGANIZATION',
        'Organization name must be at most 120 characters.',
      );
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authentication required.',
        401,
      );
    }

    const slug = await this.resolveSlug(input.slug, name);

    const saved = await this.dataSource.transaction(async (manager) => {
      const organization = await manager.save(
        Organization,
        manager.create(Organization, { name, slug }),
      );
      await manager.save(
        OrganizationMember,
        manager.create(OrganizationMember, {
          organization,
          user,
          role: 'owner',
        }),
      );
      return organization;
    });

    this.logger.log(`Created organization ${saved.id} for user ${userId}`);
    return this.toView(saved, 'owner');
  }

  async listForUser(userId: string): Promise<OrganizationView[]> {
    const memberships = await this.members.find({
      where: { user: { id: userId } },
      relations: { organization: true },
      order: { createdAt: 'ASC' },
    });

    return memberships.map((membership) =>
      this.toView(membership.organization, membership.role),
    );
  }

  async getForUser(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationView> {
    const membership = await this.requireMembership(userId, organizationId);
    return this.toView(membership.organization, membership.role);
  }

  async updateForOwner(
    userId: string,
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationView> {
    const membership = await this.requireMembership(userId, organizationId);
    assertCan(membership.role, 'update_organization');

    const organization = membership.organization;
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new ApplicationError(
          'INVALID_ORGANIZATION',
          'Organization name is required.',
        );
      }
      if (name.length > 120) {
        throw new ApplicationError(
          'INVALID_ORGANIZATION',
          'Organization name must be at most 120 characters.',
        );
      }
      organization.name = name;
    }

    if (input.slug !== undefined) {
      organization.slug = await this.resolveSlug(
        input.slug,
        organization.name,
        organization.id,
      );
    }

    const saved = await this.organizations.save(organization);
    return this.toView(saved, membership.role);
  }

  async requireMembership(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember> {
    const membership = await this.members.findOne({
      where: {
        user: { id: userId },
        organization: { id: organizationId },
      },
      relations: { organization: true },
    });

    if (!membership) {
      throw new ApplicationError(
        'ORGANIZATION_NOT_FOUND',
        'Organization not found.',
        404,
      );
    }

    return membership;
  }

  private async resolveSlug(
    rawSlug: string | null | undefined,
    name: string,
    excludeOrganizationId?: string,
  ): Promise<string | null> {
    if (rawSlug === null) {
      return null;
    }

    let candidate =
      typeof rawSlug === 'string' && rawSlug.trim()
        ? this.normalizeSlug(rawSlug)
        : this.normalizeSlug(name);

    if (!candidate) {
      candidate = 'org';
    }

    if (!this.isValidSlug(candidate)) {
      throw new ApplicationError(
        'INVALID_ORGANIZATION_SLUG',
        'Slug must be 2–80 characters: lowercase letters, numbers, and hyphens.',
      );
    }

    let attempt = candidate;
    for (let i = 0; i < 8; i += 1) {
      const existing = await this.organizations.findOne({
        where: { slug: attempt },
      });
      if (
        !existing ||
        (excludeOrganizationId && existing.id === excludeOrganizationId)
      ) {
        return attempt;
      }
      if (rawSlug !== undefined && rawSlug !== null && String(rawSlug).trim()) {
        throw new ApplicationError(
          'ORGANIZATION_SLUG_TAKEN',
          'That organization slug is already in use.',
          409,
        );
      }
      attempt = `${candidate.slice(0, 70)}-${this.shortSuffix()}`;
    }

    throw new ApplicationError(
      'ORGANIZATION_SLUG_TAKEN',
      'Unable to allocate a unique organization slug.',
      409,
    );
  }

  normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  isValidSlug(slug: string): boolean {
    return /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/.test(slug) && slug.length >= 2;
  }

  private shortSuffix(): string {
    return Math.random().toString(36).slice(2, 6);
  }

  private toView(
    organization: Organization,
    role: OrganizationMemberRole,
  ): OrganizationView {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
