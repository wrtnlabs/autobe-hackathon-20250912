import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { DiaryuserPayload } from "../../decorators/payload/DiaryuserPayload";

/**
 * Authorize and authenticate the Diaryuser role for the Mood Diary app.
 * Ensures JWT token is valid and the logical diaryuser exists in the system.
 *
 * @param request The HTTP request object containing headers
 * @returns DiaryuserPayload containing the top-level diaryuser ID and role type
 */
export async function diaryuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<DiaryuserPayload> {
  const payload: DiaryuserPayload = jwtAuthorize({ request }) as DiaryuserPayload;

  if (payload.type !== "diaryUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains the top-level diaryuser table ID
  const diaryuser = await MyGlobal.prisma.mood_diary_diaryusers.findFirst({
    where: {
      id: payload.id
    },
  });

  if (diaryuser === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
