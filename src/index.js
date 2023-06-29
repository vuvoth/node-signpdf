import PDFDocument from "pdfkit";

import {
  SignPdf,
  pdfkitAddPlaceholder,
} from './signpdf'

import fs from "node:fs";

const createPdf = (params) =>
  new Promise((resolve) => {
    const requestParams = {
      placeholder: {},
      text: "node-signpdf",
      addSignaturePlaceholder: true,
      pages: 1,
      layout: "portrait",
      ...params,
    };

    const pdf = new PDFDocument({
      autoFirstPage: false,
      size: "A4",
      layout: requestParams.layout,
      bufferPages: true,
    });
    pdf.info.CreationDate = "";

    if (requestParams.pages < 1) {
      requestParams.pages = 1;
    }

    // Add some content to the page(s)
    for (let i = 0; i < requestParams.pages; i += 1) {
      pdf
        .addPage()
        .fillColor("#333")
        .fontSize(25)
        .moveDown()
        .text(requestParams.text)
        .save();
    }

    // Collect the ouput PDF
    // and, when done, resolve with it stored in a Buffer
    const pdfChunks = [];
    pdf.on("data", (data) => {
      pdfChunks.push(data);
    });
    pdf.on("end", () => {
      resolve(Buffer.concat(pdfChunks));
    });

    if (requestParams.addSignaturePlaceholder) {
      console.log({ ...requestParams.placeholder });
      // Externally (to PDFKit) add the signature placeholder.
      const refs = pdfkitAddPlaceholder({
        pdf,
        pdfBuffer: Buffer.from([pdf]),
        reason: "I am the author",
        ...requestParams.placeholder,
      });

      // console.log(refs);
      // Externally end the streams of the created objects.
      // PDFKit doesn't know much about them, so it won't .end() them.
      Object.keys(refs).forEach((key) => refs[key].end());
    }

    // Also end the PDFDocument stream.
    // See pdf.on('end'... on how it is then converted to Buffer.
    pdf.end();
  });

try {
  const pdfBuffer = createPdf({
        placeholder: {
      signatureLength: 260,
    },
    text: "This is a document",
  });

  fs.writeFileSync("./signature-holder.pdf", pdfBuffer);
  console.log(pdfBuffer);
} catch (e) {
  // Deal with the fact the chain failed
  console.log(e);
}

try {
  let key = fs.readFileSync("./keyStore.p12");
  let pdf = fs.readFileSync("./signature-holder.pdf");
  let signer = new SignPdf();
  const signedPdf = signer.sign(pdf, key, { passphrase: "test" });

  fs.writeFileSync("./signatured.pdf", signedPdf);
} catch (e) {
  // Deal with the fact the chain failed
  console.log(e);
}
