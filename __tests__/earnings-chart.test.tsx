import { render, screen } from "@testing-library/react";
import { EarningsBarChart } from "@/components/dashboard/EarningsBarChart";

/**
 * The earnings card rendered its month labels and the current month's figure
 * over a blank space where the bars should have been. Nothing was wrong with
 * the data — the bars were there and zero pixels tall.
 *
 * Bar heights are percentages, and a percentage height resolves against the
 * containing block. The row set `items-end`, so its columns were never
 * stretched to the row's height; their height stayed `auto`, the percentages
 * computed to `auto`, and every bar collapsed. jsdom does not do layout, so
 * these assert the structure that makes layout possible rather than measuring
 * pixels: the row must not opt its columns out of stretching, and each bar must
 * carry a non-zero height.
 */
const month = (label: string, amountMinor: number) => ({ label, amountMinor });

const SERIES = [
  month("Feb", 0),
  month("Mar", 0),
  month("Apr", 12000),
  month("May", 0),
  month("Jun", 0),
  month("Jul", 0),
  month("Aug", 30600),
];

describe("EarningsBarChart", () => {
  function barRow(container: HTMLElement) {
    // The fixed-height row that holds the columns.
    return container.querySelector<HTMLElement>(".h-\\[150px\\]")!;
  }

  it("does not let the bar row opt its columns out of stretching", () => {
    // `items-end` here is the bug: it stops the columns filling the row, which
    // leaves the bars' percentage heights with nothing to resolve against.
    const { container } = render(<EarningsBarChart data={SERIES} currency="AUD" />);
    expect(barRow(container).className).not.toContain("items-end");
  });

  it("gives every bar a non-zero height", () => {
    const { container } = render(<EarningsBarChart data={SERIES} currency="AUD" />);
    const bars = container.querySelectorAll<HTMLElement>('[style*="height"]');
    expect(bars.length).toBe(SERIES.length);
    for (const bar of bars) {
      const pct = Number(bar.style.height.replace("%", ""));
      expect(pct).toBeGreaterThan(0);
    }
  });

  it("scales the tallest bar to full height and floors the empty ones", () => {
    const { container } = render(<EarningsBarChart data={SERIES} currency="AUD" />);
    const heights = [...container.querySelectorAll<HTMLElement>('[style*="height"]')].map((b) =>
      Number(b.style.height.replace("%", "")),
    );
    expect(Math.max(...heights)).toBe(100); // Aug, the largest
    expect(Math.min(...heights)).toBe(2); // a true zero stays a flat baseline
  });

  it("renders every month label", () => {
    render(<EarningsBarChart data={SERIES} currency="AUD" />);
    for (const m of SERIES) expect(screen.getByText(m.label)).toBeInTheDocument();
  });

  it("floats the current month's value above its bar", () => {
    render(<EarningsBarChart data={SERIES} currency="AUD" />);
    expect(screen.getByText(/306\.00/)).toBeInTheDocument();
  });

  describe("when there is not enough history to chart", () => {
    const oneMonth = SERIES.map((m) => (m.label === "Aug" ? m : month(m.label, 0)));

    it("says so instead of drawing one bar beside six empty slots", () => {
      render(<EarningsBarChart data={oneMonth} currency="AUD" />);
      expect(screen.getByText("Not enough history to chart")).toBeInTheDocument();
      // No axis either — month labels without bars mean nothing.
      expect(screen.queryByText("Feb")).not.toBeInTheDocument();
    });

    it("distinguishes a brand-new advisor from one with a single month", () => {
      render(<EarningsBarChart data={SERIES.map((m) => month(m.label, 0))} currency="AUD" />);
      expect(screen.getByText("No earnings yet")).toBeInTheDocument();
    });

    it("keeps the same height so the card does not resize as history builds", () => {
      const { container } = render(<EarningsBarChart data={oneMonth} currency="AUD" />);
      expect(container.querySelector(".h-\\[150px\\]")).not.toBeNull();
    });
  });
});
