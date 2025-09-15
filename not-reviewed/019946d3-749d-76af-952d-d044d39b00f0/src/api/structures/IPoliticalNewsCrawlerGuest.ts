import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IPoliticalNewsCrawlerGuest {
  /**
   * Guest join request payload. For guests, this is typically empty or
   * minimal since no credentials are needed.
   */
  export type IRequest = {};

  /**
   * Authorization response containing JWT token.
   *
   * This response is returned after successful guest authentication or token
   * refresh operations. It contains guest metadata and token expiry
   * information to support authenticated guest sessions.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated guest */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;

    /** IP address of the guest user */
    ip_address: string;

    /** User agent string presented by the guest */
    user_agent?: string | null | undefined;

    /** Timestamp when the guest record was created */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the guest record was last updated */
    updated_at: string & tags.Format<"date-time">;
  };

  /** Payload containing a refresh token to renew guest JWT tokens securely. */
  export type IRefresh = {
    /** The refresh token used to obtain new JWT tokens. */
    refresh_token: string;
  };
}
