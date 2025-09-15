import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";

/**
 * Register and authorize new ATS applicant member (ats_recruitment_applicants)
 *
 * Implements applicant account creation and registration for job seekers in the
 * ATS Recruitment platform. On registration, users must provide a unique email
 * and password. The system persists the applicant in the
 * ats_recruitment_applicants table with fields: email, password_hash, name,
 * phone (optional), and is_active flag. Upon successful registration, initial
 * JWT tokens are issued for authentication. The system audit trails
 * registration. Input validation ensures email uniqueness and well-formed
 * password hashes. The API does NOT allow re-using existing emails. This
 * operation supports the typical 'join' flow for applicants as described in the
 * business requirement and schema.
 *
 * @param props - The request containing new ATS applicant registration details
 *   (body: email, password, name, phone optional)
 * @returns Authorized applicant JWT response and applicant summary for
 *   next-step onboarding
 * @throws {Error} 이미 가입된 이메일입니다. (duplicate email registration)
 */
export async function postauthApplicantJoin(props: {
  body: IAtsRecruitmentApplicant.ICreate;
}): Promise<IAtsRecruitmentApplicant.IAuthorized> {
  const { body } = props;

  // 이메일 중복 확인 (활성상태 + 소프트 삭제 아닌 것만 고려)
  const found = await MyGlobal.prisma.ats_recruitment_applicants.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (found) throw new Error("이미 가입된 이메일입니다.");

  // 비밀번호 해시
  const password_hash = await MyGlobal.password.hash(body.password);
  // UUID, 타임스탬프
  const id = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ats_recruitment_applicants.create({
    data: {
      id,
      email: body.email,
      password_hash,
      name: body.name,
      phone: body.phone ?? undefined,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // JWT 만료 계산 (access: 1시간, refresh: 7일)
  const access_exp = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60));
  const refresh_exp = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  );
  // JWT 토큰 발급: payload 반드시 "id", "type"만 명시 (payload 타입 강제 금지!)
  const access = jwt.sign(
    { id: created.id, type: "applicant" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: created.id, type: "applicant" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: created.id,
    token: {
      access,
      refresh,
      expired_at: access_exp,
      refreshable_until: refresh_exp,
    },
    email: created.email,
    name: created.name,
    phone: created.phone ?? undefined,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
