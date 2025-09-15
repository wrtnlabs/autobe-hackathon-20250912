import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * OpenAPI-compliant login endpoint for the single logical diaryUser
 * (mood_diary_diaryusers); no credentials accepted, always issues a token.
 *
 * This endpoint allows any client to perform a login operation and receive a
 * valid access token for the Mood Diary API. No authentication or credentials
 * are required. The operation issues a new session token and exposes only the
 * logical mood diary user's id and created_at timestamp. Tokens are generated
 * for OpenAPI/JWT compatibility, not security. Any client may invoke this
 * endpoint.
 *
 * @param props - Object containing the authenticated DiaryuserPayload
 *   (diaryUser)
 * @returns Authorized session information (IMoodDiaryDiaryUser.IAuthorized) for
 *   the logical diary user, including access and refresh tokens, session
 *   expiration metadata, id, and created_at.
 * @throws {Error} If the logical diaryUser record is not found in the database
 *   (system invariant error).
 */
export async function postauthDiaryUserLogin(props: {
  diaryUser: DiaryuserPayload;
}): Promise<IMoodDiaryDiaryUser.IAuthorized> {
  // Lookup the unique logical diary user
  const diaryUser = await MyGlobal.prisma.mood_diary_diaryusers.findFirst();
  if (!diaryUser) {
    throw new Error("Logical diary user not found in database");
  }

  // ISO timestamp strings for token expiry metadata
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60),
  ); // 1hr
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ); // 7 days

  // Create JWT access and refresh tokens for the mood diary user
  const accessToken = jwt.sign(
    { id: diaryUser.id, type: "diaryUser" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: diaryUser.id, type: "diaryUser", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: diaryUser.id,
    created_at: toISOStringSafe(diaryUser.created_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
