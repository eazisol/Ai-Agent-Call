import { Repository } from 'typeorm';

type MockFn = jest.Mock;

export type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, MockFn>
>;

export function createRepositoryMock<T extends object>(): MockRepository<T> {
  return {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
}
