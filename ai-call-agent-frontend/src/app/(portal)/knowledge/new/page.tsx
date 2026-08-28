"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import { EmptyState } from "@/components/patterns/empty-state";
import { FormField } from "@/components/patterns/form-field";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  canCreateKnowledge,
  knowledgeApi,
  type KnowledgeFaqItem,
} from "@/lib/knowledge-api";
import { cn } from "@/lib/utils";

type CreateTab = "file" | "url" | "text" | "faq";

const TABS: { id: CreateTab; label: string }[] = [
  { id: "file", label: "File" },
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "faq", label: "FAQ" },
];

export default function CreateKnowledgePage() {
  const router = useRouter();
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreate = canCreateKnowledge(org?.role);

  const [tab, setTab] = React.useState<CreateTab>("file");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [faqItems, setFaqItems] = React.useState<KnowledgeFaqItem[]>([
    { question: "", answer: "" },
  ]);

  if (bizStatus === "loading") {
    return <LoadingState label="Loading business…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Choose an active business before creating knowledge."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (!canCreate) {
    return (
      <EmptyState
        icon={Store}
        title="Permission required"
        description="Only owners, admins, and managers can create knowledge sources."
        action={
          <Button asChild variant="outline">
            <Link href="/knowledge">Back to knowledge</Link>
          </Button>
        }
      />
    );
  }

  const validate = (): string | null => {
    if (!name.trim()) return "Name is required.";
    if (tab === "file" && !file) return "Choose a file to upload.";
    if (tab === "url" && !url.trim()) return "URL is required.";
    if (tab === "text" && !text.trim()) return "Text body is required.";
    if (tab === "faq") {
      const cleaned = faqItems
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
        .filter((item) => item.question || item.answer);
      if (cleaned.length === 0) {
        return "Add at least one FAQ question and answer.";
      }
      if (cleaned.some((item) => !item.question || !item.answer)) {
        return "Each FAQ row needs both a question and an answer.";
      }
    }
    return null;
  };

  const onSubmit = async () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setSubmitting(true);
    setError(null);

    const desc = description.trim() || null;
    let result;
    if (tab === "file" && file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name.trim());
      if (desc) formData.append("description", desc);
      result = await knowledgeApi.createFile(formData);
    } else if (tab === "url") {
      result = await knowledgeApi.createUrl({
        name: name.trim(),
        url: url.trim(),
        description: desc,
      });
    } else if (tab === "text") {
      result = await knowledgeApi.createText({
        name: name.trim(),
        text: text.trim(),
        description: desc,
      });
    } else {
      const items = faqItems
        .map((item) => ({
          question: item.question.trim(),
          answer: item.answer.trim(),
        }))
        .filter((item) => item.question && item.answer);
      result = await knowledgeApi.createFaq({
        name: name.trim(),
        faqItems: items,
        description: desc,
      });
    }

    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/knowledge/${result.data.source.id}`);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create knowledge
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a shared source for {business.name}. Assign it to agents later.
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Knowledge type"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === item.id
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setTab(item.id);
              setError(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-6">
        <FormField label="Name" htmlFor="knowledge-name" required>
          <Input
            id="knowledge-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Clinic hours"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Description" htmlFor="knowledge-description">
          <Textarea
            id="knowledge-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={submitting}
            placeholder="Optional note for your team"
          />
        </FormField>

        {tab === "file" ? (
          <FormField label="File" htmlFor="knowledge-file" required>
            <Input
              id="knowledge-file"
              type="file"
              accept=".pdf,.txt,.md,.docx,.csv,application/pdf,text/plain,text/markdown,text/csv"
              disabled={submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, TXT, MD, DOCX, or CSV (max ~10MB).
            </p>
          </FormField>
        ) : null}

        {tab === "url" ? (
          <FormField label="URL" htmlFor="knowledge-url" required>
            <Input
              id="knowledge-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hours"
              disabled={submitting}
            />
          </FormField>
        ) : null}

        {tab === "text" ? (
          <FormField label="Text" htmlFor="knowledge-text" required>
            <Textarea
              id="knowledge-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              disabled={submitting}
              placeholder="Paste the content agents should know…"
            />
          </FormField>
        ) : null}

        {tab === "faq" ? (
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border border-border/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">FAQ {index + 1}</p>
                  {faqItems.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={submitting}
                      onClick={() =>
                        setFaqItems((rows) =>
                          rows.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <FormField
                  label="Question"
                  htmlFor={`faq-q-${index}`}
                  required
                >
                  <Input
                    id={`faq-q-${index}`}
                    value={item.question}
                    disabled={submitting}
                    onChange={(e) =>
                      setFaqItems((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, question: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </FormField>
                <FormField label="Answer" htmlFor={`faq-a-${index}`} required>
                  <Textarea
                    id={`faq-a-${index}`}
                    value={item.answer}
                    rows={3}
                    disabled={submitting}
                    onChange={(e) =>
                      setFaqItems((rows) =>
                        rows.map((row, i) =>
                          i === index
                            ? { ...row, answer: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </FormField>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() =>
                setFaqItems((rows) => [...rows, { question: "", answer: "" }])
              }
            >
              Add FAQ item
            </Button>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive-strong" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button asChild variant="outline" disabled={submitting}>
            <Link href="/knowledge">Cancel</Link>
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void onSubmit()}
          >
            {submitting ? "Creating…" : "Create knowledge"}
          </Button>
        </div>
      </div>
    </div>
  );
}
