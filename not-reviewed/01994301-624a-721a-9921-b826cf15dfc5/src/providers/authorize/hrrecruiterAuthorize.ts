import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { HrrecruiterPayload } from "../../decorators/payload/HrrecruiterPayload";

/**
 * 인증된 HR 리크루터(JWT)를 반환합니다.
 * @throws ForbiddenException 권한 불일치 및 존재하지 않는 계정
 */
export async function hrrecruiterAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<HrrecruiterPayload> {
  const payload: HrrecruiterPayload = jwtAuthorize({ request }) as HrrecruiterPayload;

  if (payload.type !== "hrRecruiter") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id는 HR 리크루터 테이블 PK와 동일합니다.
  const recruiter = await MyGlobal.prisma.ats_recruitment_hrrecruiters.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_active: true,
    },
  });

  if (!recruiter) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
