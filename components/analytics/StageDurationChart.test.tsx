import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageDurationChart } from "./StageDurationChart";
import { STATUS_META } from "@/lib/constants";
import type { StageDuration } from "@/lib/analytics/rollup";

// The chart is presentational, but the analytics tab it lives in is rendered
// inside the wallet/soroban providers. Mock them so the test stays isolated.
vi.mock("@/lib/wallet/WalletProvider", () => ({
  useWallet: () => ({ address: null, connected: false }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/soroban/SorobanProvider", () => ({
  useSoroban: () => ({ status: "idle", contractId: null }),
  SorobanProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const durations: StageDuration[] = [
  { status: "PENDING", avgMs: 500, samples: 1 },
  { status: "PROCESSING", avgMs: 2500, samples: 3 },
  { status: "COMPLETED", avgMs: 90000, samples: 2 },
  { status: "FAILED", avgMs: 0, samples: 0 },
];

describe("StageDurationChart", () => {
  it("renders one meter per stage with the status label", () => {
    render(<StageDurationChart durations={durations} />);

    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(durations.length);

    for (const { status } of durations) {
      expect(screen.getByText(status)).toBeInTheDocument();
    }
  });

  it("formats durations in ms, s and m and shows the em dash for zero", () => {
    render(<StageDurationChart durations={durations} />);

    expect(screen.getByText(/500ms/)).toBeInTheDocument();
    expect(screen.getByText(/2\.5s/)).toBeInTheDocument();
    expect(screen.getByText(/1\.5m/)).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("pluralises the sample count and omits it when there are no samples", () => {
    render(<StageDurationChart durations={durations} />);

    expect(screen.getByText(/· 1 sample$/)).toBeInTheDocument();
    expect(screen.getByText(/· 3 samples$/)).toBeInTheDocument();
    expect(screen.getByText(/· 2 samples$/)).toBeInTheDocument();
    expect(screen.queryByText(/· 0 samples/)).not.toBeInTheDocument();
  });

  it("exposes accessible meter values scaled to the largest duration", () => {
    render(<StageDurationChart durations={durations} />);

    const pending = screen.getByRole("meter", { name: "PENDING avg duration: 500ms" });
    expect(pending).toHaveAttribute("aria-valuenow", "500");
    expect(pending).toHaveAttribute("aria-valuemin", "0");
    expect(pending).toHaveAttribute("aria-valuemax", "90000");

    const completed = screen.getByRole("meter", { name: "COMPLETED avg duration: 1.5m" });
    expect(completed).toHaveAttribute("aria-valuenow", "90000");
  });

  it("colors each stage label with its status token", () => {
    render(<StageDurationChart durations={durations} />);

    expect(screen.getByText("FAILED")).toHaveStyle({ color: STATUS_META.FAILED.color });
  });

  it("renders an empty container when there are no durations", () => {
    const { container } = render(<StageDurationChart durations={[]} />);

    expect(screen.queryAllByRole("meter")).toHaveLength(0);
    expect(container.firstChild).toBeInTheDocument();
  });
});
