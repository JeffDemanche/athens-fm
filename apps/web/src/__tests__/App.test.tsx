import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GET_ROOM } from "../graphql/rooms";
import App from "../App";

const roomMock = {
  request: {
    query: GET_ROOM,
    variables: { id: "abc123" },
  },
  result: {
    data: {
      room: {
        __typename: "Room",
        id: "abc123",
        name: "Studio Night",
        createdAt: "2026-07-13T00:00:00.000Z",
        updatedAt: "2026-07-13T00:00:00.000Z",
      },
    },
  },
};

function renderApp(path: string) {
  return render(
    <MockedProvider mocks={[roomMock]}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe("App routing", () => {
  it("renders the landing view", () => {
    renderApp("/");

    expect(screen.getByText("Athens FM")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a democratic dj/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/start a room/i)).toBeInTheDocument();
  });

  it("renders host and participant routes with room params", async () => {
    const { unmount } = renderApp("/rooms/abc123/host");

    expect(await screen.findByText("Studio Night")).toBeInTheDocument();
    expect(screen.getByText(/host desk/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /now playing/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^activity$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^playlist$/i }),
    ).toBeInTheDocument();
    unmount();

    renderApp("/rooms/abc123");

    expect(screen.getByRole("link", { name: /exit/i })).toBeInTheDocument();
    expect(await screen.findByText("Studio Night")).toBeInTheDocument();
  });
});
