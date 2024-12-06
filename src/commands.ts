const HelloCommand = {
  name: "hello",
  description: "Says hello back to you",
  // @ts-ignore
  run: (interaction) => {
    const user = interaction.member.user.id;
    return Promise.resolve(`Hello <@${user}>!`);
  },
};

export const Commands = [HelloCommand];
