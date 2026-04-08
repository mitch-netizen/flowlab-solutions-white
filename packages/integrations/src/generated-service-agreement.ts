import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopPosition,
  TabStopType,
  TextRun,
  WidthType
} from "docx";

const FALLBACK_GREEN = "2D6A2D";
const LIGHT_GREEN = "E8F5E9";
const DARK = "1A1A1A";
const GREY = "555555";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cleanText(input: string | null | undefined, fallback = "") {
  return (input || fallback).replace(/\s+/g, " ").trim();
}

function sanitizeHex(input: string | null | undefined, fallback: string) {
  const cleaned = (input || "").replace(/#/g, "").trim();
  return /^[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned.toUpperCase() : fallback;
}

function fieldTag(
  name: string,
  config: {
    type?: "text" | "signature" | "date" | "datenow";
    role?: string;
    readonly?: boolean;
    required?: boolean;
    width?: number;
    height?: number;
  } = {}
) {
  const parts = [name];

  if (config.type && config.type !== "text") {
    parts.push(`type=${config.type}`);
  }

  if (config.role) {
    parts.push(`role=${config.role}`);
  }

  if (config.readonly) {
    parts.push("readonly=true");
  }

  if (config.required === false) {
    parts.push("required=false");
  }

  if (config.width) {
    parts.push(`width=${config.width}`);
  }

  if (config.height) {
    parts.push(`height=${config.height}`);
  }

  return `{{${parts.join(";")}}}`;
}

function heading1(text: string, green: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: green, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: green })]
  });
}

function body(text: string) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GREY })]
  });
}

function bullet(text: string) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: "Arial", size: 20, color: GREY })]
  });
}

function spacer(size = 160) {
  return new Paragraph({ spacing: { before: size, after: 0 }, children: [new TextRun("")] });
}

function infoRow(label: string, value: string, shade: string) {
  return new TableRow({
    children: [
      new TableCell({
        borders,
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        width: { size: 2400, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 19, bold: true, color: DARK })] })]
      }),
      new TableCell({
        borders,
        shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        width: { size: 6626, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: value, font: "Arial", size: 19, color: GREY })] })]
      })
    ]
  });
}

function signatureCell(label: string, tag: string) {
  return new TableCell({
    borders: noBorders,
    width: { size: 4313, type: WidthType.DXA },
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
        children: [new TextRun({ text: tag, font: "Arial", size: 20, color: GREY })]
      }),
      new Paragraph({
        spacing: { before: 60 },
        children: [new TextRun({ text: label, font: "Arial", size: 18, color: GREY })]
      })
    ]
  });
}

export async function generateServiceAgreementTemplateDocx(input: {
  businessName: string;
  primaryColour?: string | null;
  abn?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  signerMode?: "customer_only" | "customer_and_business";
}) {
  const green = sanitizeHex(input.primaryColour, FALLBACK_GREEN);
  const businessName = cleanText(input.businessName, "FlowLab Service Business");
  const businessAddress = [input.address, input.suburb, input.state, input.postcode].filter(Boolean).join(", ") || "[Insert business address]";
  const businessEmail = cleanText(input.email, "[Insert email]");
  const businessPhone = cleanText(input.phone, "[Insert phone]");
  const businessAbn = cleanText(input.abn, "[Insert ABN]");
  const signerMode = input.signerMode ?? "customer_only";
  const includeCountersign = signerMode === "customer_and_business";

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }
          ]
        }
      ]
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 20 } } }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: green, space: 4 } },
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: businessName.toUpperCase(), font: "Arial", size: 22, bold: true, color: green }),
                  new TextRun({ text: "   |   Service Agreement", font: "Arial", size: 20, color: GREY })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                spacing: { before: 80 },
                children: [
                  new TextRun({ text: `${businessName} - Confidential`, font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ text: " of ", font: "Arial", size: 16, color: "AAAAAA" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "AAAAAA" })
                ]
              })
            ]
          })
        },
        children: [
          spacer(200),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [9026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: noBorders,
                    shading: { fill: green, type: ShadingType.CLEAR },
                    margins: { top: 280, bottom: 280, left: 400, right: 400 },
                    width: { size: 9026, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: businessName.toUpperCase(), font: "Arial", size: 38, bold: true, color: "FFFFFF" })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80 },
                        children: [new TextRun({ text: "SERVICE AGREEMENT", font: "Arial", size: 28, color: "DDFFDD" })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          spacer(240),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [4413, 200, 4413],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                    margins: { top: 140, bottom: 140, left: 200, right: 200 },
                    width: { size: 4413, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "SERVICE PROVIDER", font: "Arial", size: 17, bold: true, color: green })] }),
                      new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: businessName, font: "Arial", size: 22, bold: true, color: DARK })] }),
                      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `ABN: ${businessAbn}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Phone: ${businessPhone}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Email: ${businessEmail}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Address: ${businessAddress}`, font: "Arial", size: 19, color: GREY })] })
                    ]
                  }),
                  new TableCell({
                    borders: noBorders,
                    width: { size: 200, type: WidthType.DXA },
                    children: [new Paragraph({ children: [new TextRun("")] })]
                  }),
                  new TableCell({
                    borders,
                    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                    margins: { top: 140, bottom: 140, left: 200, right: 200 },
                    width: { size: 4413, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "CLIENT", font: "Arial", size: 17, bold: true, color: green })] }),
                      new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: `Name: ${fieldTag("customer_name", { role: "Customer", readonly: true, width: 280 })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: `Address: ${fieldTag("customer_address", { role: "Customer", readonly: true, width: 300 })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Suburb: ${fieldTag("customer_suburb", { role: "Customer", readonly: true, width: 180 })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Phone: ${fieldTag("customer_phone", { role: "Customer", readonly: true, width: 220, required: false })}`, font: "Arial", size: 19, color: GREY })] }),
                      new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `Email: ${fieldTag("customer_email", { role: "Customer", readonly: true, width: 260 })}`, font: "Arial", size: 19, color: GREY })] })
                    ]
                  })
                ]
              })
            ]
          }),
          spacer(120),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 80 },
            children: [
              new TextRun({
                text: `Agreement Date: ${fieldTag("agreement_date", { role: "Customer", type: "datenow", readonly: true, width: 180 })}     Commencement Date: ${fieldTag("commencement_date", {
                  role: "Customer",
                  readonly: true,
                  width: 180,
                  required: false
                })}`,
                font: "Arial",
                size: 18,
                color: GREY
              })
            ]
          }),
          heading1("1. Services", green),
          body("The service provider agrees to provide the following lawn and garden maintenance services at the client property listed above."),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [9026],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    width: { size: 9026, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "Quoted Service", font: "Arial", size: 20, bold: true, color: green })] }),
                      new Paragraph({
                        spacing: { before: 80 },
                        children: [new TextRun({ text: fieldTag("service_summary", { role: "Customer", readonly: true, width: 560, height: 48 }), font: "Arial", size: 19, color: GREY })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    shading: { fill: "F9F9F9", type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 200, right: 200 },
                    width: { size: 9026, type: WidthType.DXA },
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "Scope Notes", font: "Arial", size: 20, bold: true, color: DARK })] }),
                      new Paragraph({
                        spacing: { before: 80 },
                        children: [new TextRun({ text: fieldTag("quote_scope", { role: "Customer", readonly: true, width: 560, height: 96, required: false }), font: "Arial", size: 19, color: GREY })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          spacer(160),
          heading1("2. Service Schedule & Access", green),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [2600, 6426],
            rows: [
              infoRow("Frequency", fieldTag("service_frequency", { role: "Customer", readonly: true, width: 240, required: false }), LIGHT_GREEN),
              infoRow("Preferred Day", fieldTag("preferred_day", { role: "Customer", readonly: true, width: 240, required: false }), "F9F9F9"),
              infoRow("Property Access", "Client to ensure the property is accessible on scheduled days", LIGHT_GREEN)
            ]
          }),
          body("The client must ensure gates are unlocked, pets are secured, and the lawn area is clear of obstacles prior to each visit."),
          spacer(160),
          heading1("3. Pricing & Payment", green),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: [2600, 6426],
            rows: [
              infoRow("Service Fee", fieldTag("quote_amount", { role: "Customer", readonly: true, width: 220 }), LIGHT_GREEN),
              infoRow("Payment Due", "Within 7 days of invoice", "F9F9F9"),
              infoRow("Payment Method", "EFT / Bank transfer - details on invoice", LIGHT_GREEN)
            ]
          }),
          body("Invoices will be issued by email following each service. Prices may be reviewed with at least 14 days written notice."),
          spacer(160),
          heading1("4. Cancellations & Rescheduling", green),
          bullet("A minimum of 24 hours notice is required to cancel or reschedule a service."),
          bullet("Late cancellations may incur a fee of up to 50% of the scheduled service cost."),
          bullet("If the service provider is unable to attend due to weather or other unforeseen circumstances, the service will be rescheduled at no additional charge."),
          spacer(160),
          heading1("5. Client Obligations", green),
          bullet("Ensure clear and safe access to the property on all scheduled service days."),
          bullet("Remove or advise of any obstacles or hazards on the lawn prior to each visit, including toys, hoses, tools, and pet waste."),
          bullet("Notify the service provider of any underground irrigation systems, cables, or other subsurface hazards."),
          bullet("Ensure all pets are secured away from the work area during the service."),
          spacer(160),
          heading1("6. Quality & Complaints", green),
          bullet("If the client is not satisfied with the standard of service, they must notify the service provider within 24 hours of the service being completed."),
          bullet("The service provider will attend to any genuine concerns promptly and at no additional charge."),
          spacer(160),
          heading1("7. Liability & Insurance", green),
          bullet("The service provider holds current public liability insurance and can provide proof of currency on request."),
          bullet("The service provider will not be liable for damage caused by pre-existing conditions or undisclosed hazards."),
          bullet("The client accepts responsibility for ensuring the property is safe for service personnel."),
          spacer(160),
          heading1("8. Term & Termination", green),
          bullet("This agreement commences on the date recorded above and continues until terminated by either party."),
          bullet("Either party may terminate this agreement by providing 14 days written notice."),
          bullet("Termination does not affect any outstanding payment obligations."),
          spacer(160),
          heading1("9. General", green),
          bullet("This agreement is governed by the laws of the relevant Australian state or territory where the service is delivered."),
          bullet("Any amendments to this agreement must be agreed in writing by both parties."),
          bullet("If any provision of this agreement is found to be unenforceable, the remaining provisions continue in full force."),
          spacer(200),
          heading1("10. Agreement & Signatures", green),
          body("By signing below, both parties confirm they have read, understood, and agreed to the terms of this service agreement."),
          spacer(240),
          new Table({
            width: { size: 9026, type: WidthType.DXA },
            columnWidths: includeCountersign ? [4313, 400, 4313] : [9026],
            rows: [
              new TableRow({
                children: includeCountersign
                  ? [
                      signatureCell("Signature - Business", fieldTag("business_signature", { type: "signature", role: "Business", width: 220 })),
                      new TableCell({
                        borders: noBorders,
                        width: { size: 400, type: WidthType.DXA },
                        children: [new Paragraph({ children: [new TextRun("")] })]
                      }),
                      signatureCell("Signature - Client", fieldTag("customer_signature", { type: "signature", role: "Customer", width: 220 }))
                    ]
                  : [
                      new TableCell({
                        borders: noBorders,
                        width: { size: 9026, type: WidthType.DXA },
                        children: [
                          new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
                            children: [new TextRun({ text: fieldTag("customer_signature", { type: "signature", role: "Customer", width: 220 }), font: "Arial", size: 20, color: GREY })]
                          }),
                          new Paragraph({
                            spacing: { before: 60 },
                            children: [new TextRun({ text: "Signature - Client", font: "Arial", size: 18, color: GREY })]
                          })
                        ]
                      })
                    ]
              }),
              new TableRow({
                children: includeCountersign
                  ? [
                      signatureCell("Name (Print)", fieldTag("business_signer_name", { role: "Business", readonly: true, width: 220, required: false })),
                      new TableCell({
                        borders: noBorders,
                        width: { size: 400, type: WidthType.DXA },
                        children: [new Paragraph({ children: [new TextRun("")] })]
                      }),
                      signatureCell("Name (Print)", fieldTag("customer_full_name", { role: "Customer", readonly: true, width: 220 }))
                    ]
                  : [
                      new TableCell({
                        borders: noBorders,
                        width: { size: 9026, type: WidthType.DXA },
                        children: [
                          new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
                            children: [new TextRun({ text: fieldTag("customer_full_name", { role: "Customer", readonly: true, width: 220 }), font: "Arial", size: 20, color: GREY })]
                          }),
                          new Paragraph({
                            spacing: { before: 60 },
                            children: [new TextRun({ text: "Name (Print)", font: "Arial", size: 18, color: GREY })]
                          })
                        ]
                      })
                    ]
              }),
              new TableRow({
                children: includeCountersign
                  ? [
                      signatureCell("Date", fieldTag("business_signed_at", { type: "datenow", role: "Business", readonly: true, width: 220, required: false })),
                      new TableCell({
                        borders: noBorders,
                        width: { size: 400, type: WidthType.DXA },
                        children: [new Paragraph({ children: [new TextRun("")] })]
                      }),
                      signatureCell("Date", fieldTag("customer_signed_at", { type: "datenow", role: "Customer", readonly: true, width: 220 }))
                    ]
                  : [
                      new TableCell({
                        borders: noBorders,
                        width: { size: 9026, type: WidthType.DXA },
                        children: [
                          new Paragraph({
                            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 1 } },
                            children: [new TextRun({ text: fieldTag("customer_signed_at", { type: "datenow", role: "Customer", readonly: true, width: 220 }), font: "Arial", size: 20, color: GREY })]
                          }),
                          new Paragraph({
                            spacing: { before: 60 },
                            children: [new TextRun({ text: "Date", font: "Arial", size: 18, color: GREY })]
                          })
                        ]
                      })
                    ]
              })
            ]
          }),
          spacer(240),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
            children: [
              new TextRun({ text: `Thank you for choosing ${businessName}. `, font: "Arial", size: 20, bold: true, color: green }),
              new TextRun({ text: "We look forward to keeping your property looking its best.", font: "Arial", size: 20, color: GREY })
            ]
          })
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}
