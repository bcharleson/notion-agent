import { Client } from '@notionhq/client';

/**
 * Thin wrapper around the official @notionhq/client.
 * Exposes each namespace directly so command handlers can use:
 *   client.databases.retrieve(...)
 *   client.pages.create(...)
 *   client.blocks.children.list(...)
 */
export class NotionClient {
  private notion: Client;
  readonly token: string;

  constructor(token: string) {
    this.token = token;
    this.notion = new Client({
      auth: token,
      notionVersion: '2022-06-28',
      // Suppress all SDK logging — errors are captured by our own error handler.
      // The SDK uses console[level] internally; console.info goes to stdout which
      // breaks JSON piping. A no-op logger prevents any SDK output on any level.
      logger: () => {},
    });
  }

  get databases() {
    return this.notion.databases;
  }

  get pages() {
    return this.notion.pages;
  }

  get blocks() {
    return this.notion.blocks;
  }

  get users() {
    return this.notion.users;
  }

  get comments() {
    return this.notion.comments;
  }

  get search() {
    return this.notion.search.bind(this.notion);
  }
}
