import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import Subscription from "@/pages/subscription";

jest.mock("next-auth/react");
jest.mock("@stripe/stripe-js");

describe("Subscription Page", () => {
  beforeEach(() => {
    useSession.mockReturnValue({
      data: { user: { email: "test@example.com" } },
      status: "authenticated",
    });
  });

  it("renders subscription plans", () => {
    render(<Subscription />);

    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("$10/month")).toBeInTheDocument();
    expect(screen.getByText("$25/month")).toBeInTheDocument();
  });

  it("handles subscription button click", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ sessionId: "test_session" }),
    });
    global.fetch = mockFetch;

    render(<Subscription />);

    const subscribeButton = screen.getAllByText("Subscribe")[0];
    fireEvent.click(subscribeButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/stripe/create-checkout-session",
        expect.any(Object),
      );
    });
  });

  it("handles subscription errors", async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error("API error"));
    global.fetch = mockFetch;
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<Subscription />);

    const subscribeButton = screen.getAllByText("Subscribe")[0];
    fireEvent.click(subscribeButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
