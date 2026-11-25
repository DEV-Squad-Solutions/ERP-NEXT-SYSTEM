import { baseApi } from "../../lib/baseApi";

export const screenAccessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyScreenAccess: builder.query({
      query: () => "/ScreenAccess/me",
      providesTags: ["ScreenAccess"],
    }),
    getUserScreenAccess: builder.query({
      query: (userId) => `/ScreenAccess/users/${userId}`,
      providesTags: (_r, _e, userId) => [{ type: "ScreenAccess", id: userId }],
    }),
    setUserScreenAccess: builder.mutation({
      query: ({ userId, hiddenScreens }) => ({
        url: `/ScreenAccess/users/${userId}`,
        method: "PUT",
        body: { hiddenScreens },
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "ScreenAccess", id: userId },
        "ScreenAccess",
      ],
    }),
  }),
});

export const {
  useGetMyScreenAccessQuery,
  useGetUserScreenAccessQuery,
  useSetUserScreenAccessMutation,
} = screenAccessApi;
