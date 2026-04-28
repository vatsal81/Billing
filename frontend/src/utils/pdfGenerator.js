import html2pdf from 'html2pdf.js';

/**
 * Generates a PDF blob from a DOM element.
 * @param {HTMLElement} element The element to capture.
 * @param {string} filename The name of the file.
 * @returns {Promise<Blob>}
 */
export const generatePDFBlob = async (element, filename = 'bill.pdf') => {
  const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Use worker to get the blob
  const worker = html2pdf().from(element).set(opt);
  const pdfOutput = await worker.output('blob');
  return pdfOutput;
};
