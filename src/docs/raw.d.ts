// Vite `?raw` imports (Storybook only): the file's text.
declare module '*?raw' {
  const text: string;
  export default text;
}
