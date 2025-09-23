from django.db import models                                                                                      
from django.conf import settings                                                                                  
                                                                                                                  
class RawEmail(models.Model):                                                                                     
    """                                                                                                           
    Model to store raw email data for training purposes.                                                          
    """                                                                                                           
    user = models.ForeignKey(                                                                                     
        settings.AUTH_USER_MODEL,                                                                                 
        on_delete=models.CASCADE,                                                                                 
        related_name='raw_emails'                                                                                 
    )                                                                                                             
    gmail_account = models.ForeignKey(                                                                            
        'integrations.GmailAccount',                                                                              
        on_delete=models.SET_NULL,                                                                                
        null=True,                                                                                                
        blank=True,                                                                                               
        related_name='raw_emails'                                                                                 
    )                                                                                                             
    message_id = models.CharField(max_length=255, unique=True)                                                    
    headers = models.JSONField(default=dict)                                                                      
    subject = models.CharField(max_length=1000)                                                                   
    sender = models.CharField(max_length=1000)                                                                    
    body_text = models.TextField(blank=True)                                                                      
    body_html = models.TextField(blank=True)                                                                      
    received_at = models.DateTimeField()                                                                          
    created_at = models.DateTimeField(auto_now_add=True)                                                          
                                                                                                                  
    def __str__(self):                                                                                            
        return f"Email from {self.sender} to {self.user.email} - {self.subject}"   