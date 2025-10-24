declare module "html-docx-js/dist/html-docx" {
  const htmlDocx: {
    asBlob: (html: string, options?: any) => Blob
    asBase64: (html: string, options?: any) => string
  }
  export default htmlDocx
}
