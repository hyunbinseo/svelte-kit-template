CREATE TRIGGER on_user_deactivate
AFTER UPDATE OF deactivated_at ON user
WHEN NEW.deactivated_at IS NOT NULL AND OLD.deactivated_at IS NULL
BEGIN
  UPDATE user_role
  SET revoked_at = NEW.deactivated_at, revoked_by = NEW.deactivated_by
  WHERE user_id = NEW.id AND revoked_at IS NULL;

  INSERT INTO token_ban (token_id, reason, effective_at, banned_at, banned_by, ip)
  SELECT t.id, 'deactivate', NEW.deactivated_at, NEW.deactivated_at, NEW.deactivated_by, ''
  FROM token t
  LEFT JOIN token_ban tb ON t.id = tb.token_id
  WHERE t.user_id = NEW.id AND tb.token_id IS NULL AND t.expires_at > NEW.deactivated_at;
END;
