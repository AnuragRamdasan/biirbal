import { render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import Dashboard from "@/pages/dashboard";

jest.mock("next-auth/react");

describe("Dashboard", () => {
  const mockArticles = [
    {
      id: "1",
      url: "https://example.com/1",
      audioUrl: "https://audio1.mp3",
      channel: { name: "general" },
    },
    {
      id: "2",
      url: "https://example.com/2",
      audioUrl: "https://audio2.mp3",
      channel: { name: "random" },
    },
  ];

  const mockChannels = [
    { id: "1", name: "general" },
    { id: "2", name: "random" },
  ];

  const renderDashboard = () => <Dashboard />;

  beforeEach(() => {
    useSession.mockReturnValue({
      data: { user: { email: "test@example.com" } },
      status: "authenticated",
    });

    global.fetch = jest
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockArticles),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve(mockChannels),
        })
      );
  });

  it("renders dashboard with articles and channels", async () => {
    render(renderDashboard());

    await waitFor(() => {
      expect(screen.getByText("Workspace Dashboard")).toBeInTheDocument();
      expect(screen.getByText("#general")).toBeInTheDocument();
      expect(screen.getByText("#random")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/1")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/2")).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    global.fetch = jest.fn().mockRejectedValue(new Error("API Error"));

    render(renderDashboard());

    await waitFor(() => {
      expect(screen.getByText("Workspace Dashboard")).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("does not fetch data when not authenticated", async () => {
    useSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(renderDashboard());

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
