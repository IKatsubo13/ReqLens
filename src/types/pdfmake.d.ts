declare module 'pdfmake/build/pdfmake' {
  interface PdfMakeBrowser {
    addFontContainer(container: unknown): void;
    createPdf(definition: unknown): {
      getBuffer(): Promise<Uint8Array>;
    };
  }

  const pdfMake: PdfMakeBrowser;
  export default pdfMake;
}

declare module 'pdfmake/build/fonts/Roboto.js' {
  const fontContainer: unknown;
  export default fontContainer;
}
