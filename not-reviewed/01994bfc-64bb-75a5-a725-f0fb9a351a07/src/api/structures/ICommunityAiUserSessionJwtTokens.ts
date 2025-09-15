import { tags } from "typia";

export namespace ICommunityAiUserSessionJwtTokens {
  /** Search criteria for filtering JWT tokens associated with user sessions. */
  export type IRequest = {
    /** Filter by token type such as 'access' or 'refresh'. */
    token_type?: string | null | undefined;

    /** Filter records by revocation timestamp. */
    revoked_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Filter records by expiration timestamp. */
    expires_at?: (string & tags.Format<"date-time">) | null | undefined;

    /** Page number for pagination. */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /** Record limit per page for pagination. */
    limit?: (number & tags.Type<"int32">) | null | undefined;
  };
}
