from dataline.models.user.model import UserModel


def test_user_model_has_default_connection_id():
    assert hasattr(UserModel, "default_connection_id")
