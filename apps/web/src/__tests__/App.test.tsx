import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        service: "athens-fm-api",
        database: "disconnected",
        redis: "disconnected",
        timestamp: "2026-07-13T00:00:00.000Z",
      }),
    }) as jest.Mock;
  });

  it("renders the brand and hero copy", async () => {
    render(<App />);
    expect(screen.getByText("Athens FM")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a democratic dj/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/athens-fm-api/i)).toBeInTheDocument();
  });
});
