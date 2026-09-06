"""Generate the user's Sunsteel reference through their local Trellis service."""
import json
import requests

if __name__ == '__main__':
    fields = {
        'projectId': '1787909743082', 'workflowId': '14',
        'name': 'Sunsteel Vanguard Tank', 'persistProcessingCard': 'false',
        'detachedAsset': 'true',
        'inputValues': json.dumps({'6.image': 446, '209.value': 80000,
                                  '214.seed': 446, '258.to_resolution': 1024,
                                  '261.texture_size': 2048,
                                  '194.remove_background': True}),
    }
    response = requests.post('http://localhost:3001/api/comfyui/workflows/run',
                             files={k: (None, v) for k, v in fields.items()}, timeout=120)
    print(response.text)
    response.raise_for_status()
