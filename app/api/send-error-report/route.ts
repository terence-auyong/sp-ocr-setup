import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

export async function POST(req: Request) {
    try {
        const { email, fileName, fileBase64 } = await req.json();

        const ses = new SESv2Client({
            region: process.env.AWS_REGION || "ap-southeast-1",
        });

        const command = new SendEmailCommand({
            FromEmailAddress: "swiftpoint.noreply@electronicscience.net",
            Destination: {
                ToAddresses: [email],
            },
            Content: {
                Raw: {
                    Data: await buildRawEmail({
                        from: "swiftpoint.noreply@electronicscience.net",
                        to: email,
                        subject: "OCR Error File",
                        text: "Attached is the error report for the OCR Mapping upload.",
                        filename: fileName.replace('.xlsx', '_Errors.xlsx'),
                        fileBase64,
                    }),
                },
            },
        });

        const result = await ses.send(command);

        return Response.json({ success: true, messageId: result.MessageId });
    } catch (err) {
        console.error("SES Send Error:", err);
        return Response.json(
            { success: false, error: (err as Error).message },
            { status: 500 }
        );
    }
}

async function buildRawEmail({
    from,
    to,
    subject,
    text,
    filename,
    fileBase64,
}: {
    from: string;
    to: string;
    subject: string;
    text: string;
    filename: string;
    fileBase64: string;
}): Promise<Uint8Array> {
    const boundary = `----=_Part_${Date.now()}`;

    const rawEmail = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        text,
        ``,
        `--${boundary}`,
        `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${filename}"`,
        ``,
        // Split base64 into 76-char lines as per MIME spec
        fileBase64.match(/.{1,76}/g)?.join('\n') ?? fileBase64,
        ``,
        `--${boundary}--`,
    ].join('\n');

    return new TextEncoder().encode(rawEmail);
}