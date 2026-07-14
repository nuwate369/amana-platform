-- ============================================================
-- 0018_fix_protected_update.sql
-- تعديل الحماية للسماح بتعديل الحقول الشخصية (الاسم، الصورة، التفضيلات)
-- الحماية تبقى فقط على: الدور، is_protected
-- ============================================================

-- تحديث الدالة للسماح بالتعديل على الحقول الشخصية
CREATE OR REPLACE FUNCTION public.prevent_protected_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- الحماية فقط على الحقول الحساسة
  IF OLD.is_protected = true THEN
    -- منع تغيير الدور
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: لا يمكن تغيير دور الحسابات المحمية.';
    END IF;

    -- منع تغيير is_protected
    IF OLD.is_protected IS DISTINCT FROM NEW.is_protected THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: لا يمكن تغيير حالة الحماية.';
    END IF;

    -- منع تغيير المعرّف
    IF OLD.id IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'PROTECTED_PROFILE: لا يمكن تغيير معرّف الحساب.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_protected_update() IS 'حماية الحقول الحساسة فقط: الدور، is_protected. يسمح بتعديل الاسم والصورة والتفضيلات.';
