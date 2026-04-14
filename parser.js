const EventEmitter = require('events');

// Constants for part types and keys
const PART_KEY_MESSAGE_TYPE = 0;
const PART_KEY_TIMESTAMP_S = 1;
const PART_KEY_TIMESTAMP_MS = 2;
const PART_KEY_TIMESTAMP_US = 3;
const PART_KEY_THREAD_ID = 4;
const PART_KEY_TAG = 5;
const PART_KEY_LEVEL = 6;
const PART_KEY_MESSAGE = 7;
const PART_KEY_IMAGE_WIDTH = 8;
const PART_KEY_IMAGE_HEIGHT = 9;
const PART_KEY_MESSAGE_SEQ = 10;
const PART_KEY_FILENAME = 11;
const PART_KEY_LINENUMBER = 12;
const PART_KEY_FUNCTIONNAME = 13;

const PART_TYPE_STRING = 0;
const PART_TYPE_BINARY = 1;
const PART_TYPE_INT16 = 2;
const PART_TYPE_INT32 = 3;
const PART_TYPE_INT64 = 4;
const PART_TYPE_IMAGE = 5;

// Constants for Message Types
const LOGMSG_TYPE_LOG = 0;
const LOGMSG_TYPE_BLOCKSTART = 1;
const LOGMSG_TYPE_BLOCKEND = 2;
const LOGMSG_TYPE_CLIENTINFO = 3;
const LOGMSG_TYPE_DISCONNECT = 4;
const LOGMSG_TYPE_MARK = 5;

class NSLoggerParser extends EventEmitter {
    constructor() {
        super();
        this.buffer = Buffer.alloc(0);
    }

    /**
     * Appends parsed data and attempts to decode any available messages
     */
    addData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        this.parse();
    }

    parse() {
        while (this.buffer.length >= 4) {
            // Read the totalSize which specifies the size of the message excluding this 4-byte count
             const totalSize = this.buffer.readUInt32BE(0);

             if (this.buffer.length < totalSize + 4) {
                 // We do not have the complete message yet
                 break;
             }

             // We have a full message
             const messageBuffer = this.buffer.slice(4, 4 + totalSize);
             this.buffer = this.buffer.slice(4 + totalSize); // Move up buffer

             this.parseMessage(messageBuffer);
        }
    }

    parseMessage(buf) {
        if (buf.length < 2) return;

        let offset = 0;
        const partCount = buf.readUInt16BE(offset);
        offset += 2;

        const messageData = {
           parts: {}
        };

        for (let i = 0; i < partCount; i++) {
            if (offset + 2 > buf.length) break;

            const partKey = buf.readUInt8(offset);
            const partType = buf.readUInt8(offset + 1);
            offset += 2;

            let partSize = 0;
            if (partType === PART_TYPE_INT16) {
                partSize = 2;
            } else if (partType === PART_TYPE_INT32) {
                partSize = 4;
            } else if (partType === PART_TYPE_INT64) {
                partSize = 8;
            } else {
                if (offset + 4 > buf.length) break;
                partSize = buf.readUInt32BE(offset);
                offset += 4;
            }

            if (offset + partSize > buf.length) break;
            
            const partBuffer = buf.slice(offset, offset + partSize);
            offset += partSize;

            let value = null;

            if (partType === PART_TYPE_STRING) {
                value = partBuffer.toString('utf8');
            } else if (partType === PART_TYPE_BINARY || partType === PART_TYPE_IMAGE) {
                value = partBuffer; // keep as buffer
            } else if (partType === PART_TYPE_INT16) {
                value = partBuffer.readUInt16BE(0);
            } else if (partType === PART_TYPE_INT32) {
                value = partBuffer.readUInt32BE(0);
            } else if (partType === PART_TYPE_INT64) {
                value = Number(partBuffer.readBigUInt64BE(0));
            }

            // Map part to specific field
            switch(partKey) {
                case PART_KEY_MESSAGE_TYPE:
                    messageData.type = value;
                    break;
                case PART_KEY_MESSAGE_SEQ:
                    messageData.sequence = value;
                    break;
                case PART_KEY_TIMESTAMP_S:
                    messageData.timestampS = value;
                    break;
                case PART_KEY_TIMESTAMP_MS:
                    messageData.timestampMs = value;
                    break;
                case PART_KEY_TIMESTAMP_US:
                    messageData.timestampUs = value;
                    break;
                case PART_KEY_THREAD_ID:
                    messageData.threadId = value;
                    break;
                case PART_KEY_TAG:
                    messageData.tag = value;
                    break;
                case PART_KEY_LEVEL:
                    messageData.level = value;
                    break;
                case PART_KEY_MESSAGE:
                    messageData.message = value;
                    break;
                case PART_KEY_FILENAME:
                    messageData.filename = value;
                    break;
                case PART_KEY_FUNCTIONNAME:
                    messageData.functionName = value;
                    break;
                case PART_KEY_LINENUMBER:
                    messageData.lineNumber = value;
                    break;
                default:
                    messageData.parts[partKey] = value;
            }
        }

        this.emit('message', messageData);
    }
}

module.exports = NSLoggerParser;
