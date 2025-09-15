import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * Refreshes the session for the logical diaryUser by issuing a new access token
 * given a valid refresh token (mood_diary_diaryusers, single-user context).
 *
 * Allows the diaryUser (the single logical user in the Mood Diary app) to
 * refresh their session token and extend access without any login or further
 * interaction. Only a valid refresh token is required; no personal credentials
 * or data are checked. The system returns a new access token and the diary
 * user's id and created_at values from mood_diary_diaryusers. This supports
 * seamless, stateless session continuation in the single-user context. All
 * error and security handling is limited to token verification. There is no
 * multi-user management or credential validation. This operation presumes only
 * one logical user exists. Related operation: join (to obtain initial token).
 *
 * @param props - Object containing the authenticated diaryUser payload
 * @param props.diaryUser - The payload containing the top-level logical diary
 *   user's ID and type
 * @returns Updated authorized session with new token for the single logical
 *   diaryUser, including id and created_at from mood_diary_diaryusers
 * @throws {Error} If diary user does not exist in the system
 */
export async function postauthDiaryUserRefresh(props: {
  diaryUser: DiaryuserPayload;
}): Promise<IMoodDiaryDiaryUser.IAuthorized> {
  const { diaryUser } = props;
  // Find the logical diary user by ID (must always exist in this business domain)
  const user = await MyGlobal.prisma.mood_diary_diaryusers.findFirst({
    where: { id: diaryUser.id },
  });
  if (!user) {
    throw new Error("Diary user not found");
  }
  // Calculate ISO string timestamps (never use Date as type)
  const now = toISOStringSafe(new Date());
  // Calculate expiration times (1 hour for access token, 7 days for refresh token)
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Generate access token with strict payload structure
  const access = jwt.sign(
    {
      id: user.id,
      type: "diaryUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // Generate refresh token with same id/type, for continued session renewal
  const refresh = jwt.sign(
    {
      id: user.id,
      type: "diaryUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return strictly-typed authorized DTO; all fields required, no native Date
  return {
    id: user.id,
    created_at: toISOStringSafe(user.created_at),
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
