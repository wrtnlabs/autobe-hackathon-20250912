import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IOauthServerOauthServerGuest {
  /**
   * Authorization response containing JWT token.
   *
   * This response is returned after successful authentication operations such
   * as login, join, or token refresh for guest users.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated guest user */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
