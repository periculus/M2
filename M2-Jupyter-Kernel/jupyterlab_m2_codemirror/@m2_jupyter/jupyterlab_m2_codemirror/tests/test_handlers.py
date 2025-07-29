import json


async def test_get_example(jp_fetch):
    # When
    response = await jp_fetch("@m2-jupyter/jupyterlab-m2-codemirror", "get-example")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    assert payload == {
        "data": "This is /@m2-jupyter/jupyterlab-m2-codemirror/get-example endpoint!"
    }