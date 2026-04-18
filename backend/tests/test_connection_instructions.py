from dataline.models.connection.model import ConnectionModel


def test_connection_model_has_instructions_field():
    assert hasattr(ConnectionModel, "instructions")
