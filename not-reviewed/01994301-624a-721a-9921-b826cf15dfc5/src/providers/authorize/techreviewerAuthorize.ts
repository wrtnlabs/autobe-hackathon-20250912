import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TechreviewerPayload } from "../../decorators/payload/TechreviewerPayload";

/**
 * techreviewerAuthorize: 인증 Provider
 *
 * JWT 토큰을 검증하고, payload.type이 'techReviewer'인지 확인한 뒤,
 * 기술 평가자(ats_recruitment_techreviewers) 테이블에 payload.id와 일치하며,
 * 삭제(deleted_at=null), 활성화된(is_active=true) 계정만 인증합니다.
 */
export async function techreviewerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TechreviewerPayload> {
  const payload: TechreviewerPayload = jwtAuthorize({ request }) as TechreviewerPayload;

  if (payload.type !== "techReviewer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id는 top-level 유저 식별자 (techreviewers.id)
  const techReviewer = await MyGlobal.prisma.ats_recruitment_techreviewers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_active: true
    }
  });

  if (techReviewer === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
