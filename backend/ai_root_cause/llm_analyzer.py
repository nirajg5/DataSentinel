import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)


def generate_root_cause(prompt):

    try:

        response = client.chat.completions.create(

            model="openai/gpt-4o-mini",

            max_tokens=500,

            temperature=0.2,

            messages=[
                {
                    "role": "system",
                    "content": """
You are a Senior Data Reliability Engineer.

Analyze the incident and provide:

1. Root Cause
2. Business Impact
3. Severity (Low/Medium/High/Critical)
4. Recommendation

Keep the response concise and under 250 words.
"""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        return (
            response
            .choices[0]
            .message
            .content
        )

    except Exception as e:

        return f"""
Root Cause:
Unable to generate AI analysis.

Business Impact:
Unknown.

Severity:
Medium

Recommendation:
Check OpenRouter credits, API key, model availability,
or reduce token usage.

Error:
{str(e)}
"""