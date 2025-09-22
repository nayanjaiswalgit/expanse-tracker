from django.core.management.base import BaseCommand
from ai.models import PromptTemplate
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Creates default AI prompt templates."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Creating default AI prompt templates..."))

        # Get a superuser or create a dummy user if no users exist
        user = None
        if User.objects.filter(is_superuser=True).exists():
            user = User.objects.filter(is_superuser=True).first()
        elif User.objects.exists():
            user = User.objects.first()
        else:
            self.stdout.write(
                self.style.WARNING(
                    "No users found. Default prompts will be created without an associated user."
                )
            )

        prompts_to_create = [
            {
                "name": "categorization_prompt",
                "template_content": """
                Categorize this financial transaction into one of these categories:
                - Food & Dining
                - Transportation
                - Shopping
                - Entertainment
                - Bills & Utilities
                - Healthcare
                - Education
                - Travel
                - Income
                - Transfer
                - Other

                Transaction details:
                Description: {description}
                Amount: ${amount}
                Merchant: {merchant}

                Respond with only the category name and a confidence score (0-100).
                Format: Category: [category], Confidence: [score]
                """,
                "variables": {
                    "description": "string",
                    "amount": "float",
                    "merchant": "string",
                },
                "version": "1.0",
            },
            {
                "name": "invoice_generation_prompt",
                "template_content": """
                Generate a professional invoice based on this data:
                {invoice_data}

                Include:
                - Professional header with invoice number
                - Detailed description of services/products
                - Clear payment terms
                - Total amount calculation
                - Professional footer

                Format as HTML that can be converted to PDF.
                """,
                "variables": {"invoice_data": "json"},
                "version": "1.0",
            },
            {
                "name": "mcq_generation_prompt",
                "template_content": """
                Generate {num_questions} multiple-choice questions based on the following text. 
                Each question should have 4 options (A, B, C, D) and indicate the correct answer.
                Provide the output as a JSON array of objects, where each object has 'question', 'options' (an array of strings), and 'correct_answer' (string A, B, C, or D).

                Text: {text_content}
                """,
                "variables": {"text_content": "string", "num_questions": "integer"},
                "version": "1.0",
            },
            {
                "name": "interview_pdf_generation_prompt",
                "template_content": """
                Generate interview questions and a simple rubric for a candidate based on the following job description and resume summary.
                Provide the output as structured text or markdown that can be easily converted into a PDF document.

                Job Description: {job_description}
                Candidate Resume Summary: {candidate_resume_summary}
                """,
                "variables": {
                    "job_description": "string",
                    "candidate_resume_summary": "string",
                },
                "version": "1.0",
            },
            {
                "name": "resume_parsing_prompt",
                "template_content": """
                Parse the following resume text and extract key information into a JSON object. 
                Include fields like 'name', 'contact_info' (email, phone, linkedin), 'summary', 'experience' (list of objects with title, company, dates, description), 'education' (list of objects with degree, institution, dates), 'skills' (list of strings).

                Resume Text: {resume_text}
                """,
                "variables": {"resume_text": "string"},
                "version": "1.0",
            },
            {
                "name": "document_summarization_prompt",
                "template_content": """
                Summarize the following document content. The summary should be {summary_length}.

                Document Content: {document_content}
                """,
                "variables": {"document_content": "string", "summary_length": "string"},
                "version": "1.0",
            },
        ]

        for prompt_data in prompts_to_create:
            PromptTemplate.objects.update_or_create(
                name=prompt_data["name"],
                defaults={
                    "user": user,
                    "template_content": prompt_data["template_content"],
                    "variables": prompt_data["variables"],
                    "version": prompt_data["version"],
                },
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully created/updated prompt: {prompt_data['name']}"
                )
            )

        self.stdout.write(
            self.style.SUCCESS("Default AI prompt templates created successfully.")
        )
