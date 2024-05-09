export interface IOpenaiService {
    chatCompletion(text: string): Promise<string | null>;
    visionAI(imageBase64:string,text: string):  Promise<string | null>;
    generateImage(text: string): Promise<string | null>;
  }
export interface ChatMessage {
    role: 'user' | 'system' | 'assistant';  // Add more roles as necessary
    content: ContentItem[] ;
}

type ContentItem = string | TextContent | ImageContent;

interface TextContent {
    type: 'text';
    text: string;
}

interface ImageContent {
    type: 'image_url';
    image_url: {
        url: string;
    };
}