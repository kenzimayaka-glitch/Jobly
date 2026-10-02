-- Harden server-only Recruitment360 SECURITY DEFINER RPCs.
-- Public/client execution is intentionally disabled; application routes use service_role.

revoke execute on function public.recruitment360_lot11_create_public_link(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot11_get_public_listing(text) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot9_create_video_session(uuid, text) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot9_start_video_session(uuid, text) from public, anon, authenticated;
revoke execute on function public.recruitment360_lot9_finalize_video_by_participant(uuid, text, integer) from public, anon, authenticated;

grant execute on function public.recruitment360_lot11_create_public_link(uuid, text, integer) to service_role;
grant execute on function public.recruitment360_lot11_get_public_listing(text) to service_role;
grant execute on function public.recruitment360_lot9_create_video_session(uuid, text) to service_role;
grant execute on function public.recruitment360_lot9_start_video_session(uuid, text) to service_role;
grant execute on function public.recruitment360_lot9_finalize_video_by_participant(uuid, text, integer) to service_role;

-- Internal service-only tables: RLS remains enabled and the Data API roles have no direct table privileges.
revoke all on table public."Community", public."CommunityMembership", public."CommunityPost", public."CommunityPostComment", public."CommunityPostReaction", public."JobHarvestCapture", public."RecruitmentListingErratum", public."RecruitmentListingExport", public."RecruitmentListingImmutableBlock", public."RecruitmentListingPublicLink", public."RecruitmentListingPublicationConsent" from public, anon, authenticated;
grant select, insert, update, delete on table public."Community", public."CommunityMembership", public."CommunityPost", public."CommunityPostComment", public."CommunityPostReaction", public."JobHarvestCapture", public."RecruitmentListingErratum", public."RecruitmentListingExport", public."RecruitmentListingImmutableBlock", public."RecruitmentListingPublicLink", public."RecruitmentListingPublicationConsent" to service_role;
