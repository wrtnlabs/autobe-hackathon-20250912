import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { ApplicantPayload } from "../../decorators/payload/ApplicantPayload";

/**
 * 인증된 지원자(Applicant) 권한 Provider 함수.
 *
 * JWT 토큰을 검증하고 payload 정보를 확인, 해당 지원자 계정의 DB 존재 및 활성 상태를 점검합니다.
 *
 * @param request - HTTP 요청 객체 (authorization 헤더 필요)
 * @returns 인증된 지원자 payload 정보를 반환
 * @throws ForbiddenException - 권한 불일치 혹은 지원자 미존재/비활성/삭제 계정 등
 */
export async function applicantAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<ApplicantPayload> {
  const payload: ApplicantPayload = jwtAuthorize({ request }) as ApplicantPayload;

  if (payload.type !== "applicant") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // Top-level user table: ats_recruitment_applicants
  // JWT의 payload.id는 ats_recruitment_applicants의 id 필드에 매핑됨
  const applicant = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      id: payload.id,
      is_active: true,
      deleted_at: null
    },
  });

  if (applicant === null) {
    throw new ForbiddenException("You're not enrolled or your account is not active");
  }

  return payload;
}
