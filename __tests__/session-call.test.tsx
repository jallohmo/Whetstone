import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * The embedded call screen.
 *
 * The thing worth pinning here is that the meeting token reaches Daily through
 * join() rather than the room URL, and that leaving the call routes back into
 * the app instead of stranding the user on a dead iframe — that return path is
 * the whole reason for embedding rather than redirecting.
 */

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

type Handler = (event?: { errorMsg?: string }) => void;

const frame = {
  handlers: new Map<string, Handler>(),
  on: jest.fn((event: string, handler: Handler) => {
    frame.handlers.set(event, handler);
    return frame;
  }),
  join: jest.fn(async () => ({})),
  destroy: jest.fn(async () => {}),
};

const createFrame = jest.fn(() => frame);
const getCallInstance = jest.fn(() => undefined as unknown);

jest.mock("@daily-co/daily-js", () => ({
  __esModule: true,
  default: {
    createFrame: (...args: unknown[]) => createFrame(...(args as [])),
    getCallInstance: () => getCallInstance(),
  },
}));

import { SessionCall } from "@/components/booking/SessionCall";

const PROPS = {
  roomUrl: "https://whetstone.daily.co/abc123",
  token: "tok_abc",
  bookingId: "booking_1",
  viewerIsAdvisor: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  frame.handlers.clear();
  frame.join.mockResolvedValue({});
  getCallInstance.mockReturnValue(undefined);
});

describe("SessionCall", () => {
  it("joins with the token passed to Daily, not appended to the room URL", async () => {
    render(<SessionCall {...PROPS} />);

    await waitFor(() => expect(frame.join).toHaveBeenCalled());
    expect(frame.join).toHaveBeenCalledWith({
      url: "https://whetstone.daily.co/abc123",
      token: "tok_abc",
    });
  });

  it("routes back to the booking thread when the call ends", async () => {
    render(<SessionCall {...PROPS} />);
    await waitFor(() => expect(frame.handlers.has("left-meeting")).toBe(true));

    act(() => frame.handlers.get("left-meeting")!());

    expect(mockPush).toHaveBeenCalledWith("/bookings/booking_1/messages?callEnded=1");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("tears down a surviving frame before creating another", async () => {
    const stale = { destroy: jest.fn(async () => {}) };
    getCallInstance.mockReturnValue(stale);

    render(<SessionCall {...PROPS} />);

    await waitFor(() => expect(createFrame).toHaveBeenCalled());
    expect(stale.destroy).toHaveBeenCalled();
  });

  it("surfaces a Daily error with a way back rather than a blank frame", async () => {
    render(<SessionCall {...PROPS} />);
    await waitFor(() => expect(frame.handlers.has("error")).toBe(true));

    act(() => frame.handlers.get("error")!({ errorMsg: "Meeting has ended" }));

    const back = await screen.findByRole("button", { name: /back to your conversation/i });
    expect(screen.getByText("Meeting has ended")).toBeInTheDocument();

    fireEvent.click(back);
    expect(mockPush).toHaveBeenCalledWith("/bookings/booking_1/messages");
  });

  it("explains a failed connection instead of sitting on a dead iframe", async () => {
    frame.join.mockRejectedValue(new Error("network"));

    render(<SessionCall {...PROPS} />);

    expect(await screen.findByText(/couldn't connect to the call/i)).toBeInTheDocument();
  });

  it("destroys the frame on unmount", async () => {
    const { unmount } = render(<SessionCall {...PROPS} />);
    await waitFor(() => expect(frame.join).toHaveBeenCalled());

    unmount();

    expect(frame.destroy).toHaveBeenCalled();
  });
});
