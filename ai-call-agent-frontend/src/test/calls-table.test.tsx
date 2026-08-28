import { render, screen } from "@testing-library/react";
import { CallsTable } from "@/components/calls/CallsTable";
import type { CallListItem } from "@/lib/calls-api";

describe("CallsTable", () => {
  it("renders the empty state when there are no calls", () => {
    render(<CallsTable calls={[]} />);

    expect(screen.getByText("No calls found.")).toBeInTheDocument();
  });

  it("renders an error message when call loading fails", () => {
    render(
      <CallsTable
        calls={[]}
        errorMessage="Unable to load calls right now."
      />,
    );

    expect(
      screen.getByText("Unable to load calls right now."),
    ).toBeInTheDocument();
  });

  it("renders call rows when data is available", () => {
    const calls: CallListItem[] = [
      {
        id: "call-1",
        direction: "inbound",
        status: "completed",
        callerNumber: "+15550001111",
        receiverNumber: "+15550002222",
        businessId: "biz-1",
        agentId: "agent-1",
        agentName: "Reception",
        phoneNumberId: "pn-1",
        failureCode: null,
        duration: 18,
        startedAt: "2026-08-24T12:00:00.000Z",
        endedAt: "2026-08-24T12:00:18.000Z",
      },
    ];

    render(<CallsTable calls={calls} />);

    expect(screen.getByText("+15550001111")).toBeInTheDocument();
    expect(screen.getByText("18s")).toBeInTheDocument();
    expect(screen.getByText("Reception")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/calls/call-1",
    );
  });
});
