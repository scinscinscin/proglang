export const getInput = () => {
  process.stdin.setEncoding("utf8");

  return new Promise<string>((resolve) => {
    process.stdin.on("data", function (data) {
      // Remove the newline character at the end of the input
      const input = data.toString("utf-8").trim();
      resolve(input);
    });
  });
};
