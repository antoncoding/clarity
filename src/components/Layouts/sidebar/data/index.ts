import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN",
    items: [
      {
        title: "Chat",
        icon: Icons.HomeIcon,
        url: "/",
        items: [],
        showConversations: true, // Add this flag to show conversations under Chat
      },
    ],
  },
];
