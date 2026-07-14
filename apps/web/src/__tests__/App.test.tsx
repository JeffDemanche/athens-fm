import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GET_ROOM_EVENTS, ROOM_EVENT_ADDED } from "../graphql/room-events";
import { GET_ROOM } from "../graphql/rooms";
import App from "../App";

const room = {
  __typename: "Room",
  id: "abc123",
  shortId: "K7M2P",
  name: "Studio Night",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

const getRoomMock = {
  request: {
    query: GET_ROOM,
    variables: { id: "K7M2P" },
  },
  result: {
    data: {
      room,
    },
  },
};

const getRoomEventsMock = {
  request: {
    query: GET_ROOM_EVENTS,
    variables: { roomId: "abc123" },
  },
  result: {
    data: {
      roomEvents: [
        {
          __typename: "RoomEvent",
          id: "event_1",
          roomId: "abc123",
          participantId: "participant_host",
          participantName: null,
          participantRole: "HOST",
          type: "JOINED",
          createdAt: "2026-07-13T00:00:00.000Z",
        },
      ],
    },
  },
};

const roomEventAddedMock = {
  request: {
    query: ROOM_EVENT_ADDED,
    variables: { roomId: "abc123" },
  },
  result: {
    data: {
      roomEventAdded: {
        __typename: "RoomEvent",
        id: "event_1",
        roomId: "abc123",
        participantId: "participant_host",
        participantName: null,
        participantRole: "HOST",
        type: "JOINED",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
    },
  },
};

function renderApp(path: string) {
  return render(
    <MockedProvider
      mocks={[
        getRoomMock,
        getRoomEventsMock,
        roomEventAddedMock,
        getRoomMock,
      ]}
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe("App routing", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the landing view", () => {
    renderApp("/");

    expect(screen.getByText("Athens FM")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /a democratic dj/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/start a room/i)).toBeInTheDocument();
  });

  it("renders host and participant routes with room params", async () => {
    const { unmount } = renderApp("/rooms/K7M2P/host");

    expect(await screen.findByText("Studio Night")).toBeInTheDocument();
    expect(screen.getByText(/host desk/i)).toBeInTheDocument();
    expect(screen.getAllByText("K7M2P").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { name: /now playing/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/host joined the room/i)).toBeInTheDocument();
    unmount();

    renderApp("/rooms/K7M2P");

    expect(await screen.findByText("Studio Night")).toBeInTheDocument();
    expect(screen.getByLabelText(/your display name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^join room$/i }),
    ).toBeInTheDocument();
  });
});
