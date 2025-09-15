import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEasySignFreelancerUser {
  /**
   * Payload to register a freelancerUser, including email and password as
   * basic credentials.
   *
   * Security note: Password will be hashed securely; do not expose plaintext
   * in any responses.
   */
  export type ICreate = {
    /** User's unique email address used for login and communication. */
    email: string & tags.Format<"email">;

    /**
     * User's plaintext password for account creation, which will be
     * securely hashed before storage. Must be strong and confidential.
     */
    password: string;

    /** Optional user nickname or alias, may be null. */
    nickname?: string | null | undefined;
  };

  /**
   * Authorization result with JWT tokens and user info for freelancerUser.
   *
   * Contains user ID and token details for session management.
   */
  export type IAuthorized = {
    /** Unique identifier of the authenticated freelancer user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Credentials payload with email and password to authenticate
   * freelancerUser.
   *
   * Used to verify identity and issue JWT tokens upon successful login.
   */
  export type ILogin = {
    /** Email address used for authentication. */
    email: string & tags.Format<"email">;

    /** User's plaintext password for login authentication. */
    password: string;
  };

  /**
   * Payload containing refresh token for freelancerUser token renewal.
   *
   * Allows obtaining new access tokens without re-authentication.
   */
  export type IRefresh = {
    /** Refresh token string to renew JWT access tokens. */
    refresh_token: string;
  };
}
