export const typeDefs = `#graphql
  type Room {
    id: ID!
    name: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    room(id: ID!): Room
    rooms: [Room!]!
  }

  type Mutation {
    createRoom(name: String!): Room!
  }
`;
