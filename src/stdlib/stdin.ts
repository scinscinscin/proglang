import prompt from "prompt-sync";
const ask = prompt({ sigint: true });

export const getInput = () => {
  return ask("");
};
