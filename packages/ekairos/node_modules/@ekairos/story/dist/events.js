"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_CHANNEL = exports.AGENT_CHANNEL = exports.WEB_CHANNEL = exports.SYSTEM_MESSAGE_TYPE = exports.ASSISTANT_MESSAGE_TYPE = exports.USER_MESSAGE_TYPE = void 0;
exports.createUserEventFromUIMessages = createUserEventFromUIMessages;
exports.createAssistantEventFromUIMessages = createAssistantEventFromUIMessages;
exports.convertToUIMessage = convertToUIMessage;
exports.convertEventsToModelMessages = convertEventsToModelMessages;
exports.convertEventToModelMessages = convertEventToModelMessages;
exports.convertModelMessageToEvent = convertModelMessageToEvent;
const admin_1 = require("@instantdb/admin");
const ai_1 = require("ai");
const document_parser_1 = require("./document-parser");
const db = (0, admin_1.init)({
    appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
    adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
});
exports.USER_MESSAGE_TYPE = "user.message";
exports.ASSISTANT_MESSAGE_TYPE = "assistant.message";
exports.SYSTEM_MESSAGE_TYPE = "system.message";
exports.WEB_CHANNEL = "web";
exports.AGENT_CHANNEL = "whatsapp";
exports.EMAIL_CHANNEL = "email";
function createUserEventFromUIMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("Missing messages to create event");
    }
    const lastMessage = messages[messages.length - 1];
    return {
        id: lastMessage.id,
        type: exports.USER_MESSAGE_TYPE,
        channel: exports.WEB_CHANNEL,
        content: {
            parts: lastMessage.parts,
        },
        createdAt: new Date().toISOString(),
    };
}
function createAssistantEventFromUIMessages(eventId, messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("Missing messages to create event");
    }
    const lastMessage = messages[messages.length - 1];
    return {
        id: eventId,
        type: exports.ASSISTANT_MESSAGE_TYPE,
        channel: exports.WEB_CHANNEL,
        content: {
            parts: lastMessage.parts,
        },
        createdAt: new Date().toISOString(),
    };
}
function convertToUIMessage(event) {
    let role;
    if (event.type === exports.USER_MESSAGE_TYPE) {
        role = "user";
    }
    else {
        role = "assistant";
    }
    return {
        id: event.id,
        role: role,
        parts: event.content.parts,
        metadata: {
            channel: event.channel,
            type: event.type,
            createdAt: event.createdAt,
        }
    };
}
async function convertEventsToModelMessages(events) {
    const results = [];
    for (const event of events) {
        const messages = await convertEventToModelMessages(event);
        results.push(messages);
    }
    return results.flat();
}
async function convertEventToModelMessages(event) {
    // convert files in message
    // const files = event.content.parts.filter(part => part.type === "file")
    // 1. copy event to new . we will manipulate the parts
    // 2. each file part will be converted using convertFilePart
    const convertedParts = await Promise.all((event.content?.parts || []).map(async (part) => {
        if (part?.type === "file") {
            return await convertFilePart(part);
        }
        return [part];
    }));
    const newEvent = {
        ...event,
        content: {
            ...event.content,
            parts: convertedParts.flat(),
        },
    };
    // convert event to convertToModelMessages compatible
    let message = convertToUIMessage(newEvent);
    // use ai sdk helper
    return (0, ai_1.convertToModelMessages)([message]);
}
function convertModelMessageToEvent(eventId, message) {
    let type;
    switch (message.message.role) {
        case "user":
            type = exports.USER_MESSAGE_TYPE;
            break;
        case "assistant":
            type = exports.ASSISTANT_MESSAGE_TYPE;
            break;
        case "system":
            type = exports.SYSTEM_MESSAGE_TYPE;
            break;
    }
    return {
        id: eventId,
        type: type,
        channel: exports.WEB_CHANNEL,
        content: {
            parts: message.message.content,
        },
        createdAt: message.timestamp.toISOString(),
    };
}
async function convertFilePart(part) {
    // file part has data:fileId=xxxx in its url
    // we will extract that file id and call instantdb to get the file url
    if (!part?.url || typeof part.url !== "string") {
        return [part];
    }
    // Look for 'data:fileId=' pattern and extract the fileId
    const fileIdMatch = part.url.match(/data:fileId=([A-Za-z0-9_\-]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;
    if (!fileId) {
        return [part];
    }
    try {
        const fileQuery = await db.query({
            $files: {
                $: {
                    where: {
                        id: fileId,
                    },
                    limit: 1,
                },
                document: {},
            },
        });
        const fileRecord = Array.isArray(fileQuery.$files) ? fileQuery.$files[0] : undefined;
        if (!fileRecord) {
            return [part];
        }
        let documentRecord = fileRecord.document;
        if (!documentRecord || (Array.isArray(documentRecord) && documentRecord.length === 0)) {
            const fileResponse = await fetch(fileRecord.url);
            if (!fileResponse.ok) {
                return [part];
            }
            const buffer = await fileResponse.arrayBuffer();
            const documentId = await (0, document_parser_1.parseAndStoreDocument)(db, Buffer.from(buffer), fileRecord.path, fileRecord.path, fileRecord.id);
            const documentQuery = await db.query({
                documents: {
                    $: {
                        where: {
                            id: documentId,
                        },
                        limit: 1,
                    },
                },
            });
            documentRecord = Array.isArray(documentQuery.documents) ? documentQuery.documents[0] : undefined;
        }
        const parts = [];
        const fileName = documentRecord && typeof documentRecord === "object" && "fileName" in documentRecord
            ? String(documentRecord.fileName)
            : String(fileRecord.path || "Unknown");
        parts.push({
            type: "text",
            text: `User attached a file.\nFile ID: ${fileRecord.id}\nFile Name: "${fileName}"\nMedia Type: ${part.mediaType || "unknown"}`,
        });
        if (documentRecord?.content && Array.isArray(documentRecord.content.pages)) {
            const pages = documentRecord.content.pages;
            const pageTexts = pages
                .map((page, index) => {
                const text = typeof page.text === "string" ? page.text : "";
                return `\n\n--- Page ${index + 1} ---\n\n${text}`;
            })
                .join("");
            if (pageTexts.length > 0) {
                parts.push({
                    type: "text",
                    text: `Document transcription for File ID ${fileRecord.id}:${pageTexts}`,
                });
            }
        }
        return parts;
    }
    catch (error) {
        console.error("convertFilePart error", error);
        return [part];
    }
}
//# sourceMappingURL=events.js.map