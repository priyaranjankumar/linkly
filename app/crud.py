from sqlalchemy.orm import Session
import models

def get_link_by_id(db: Session, link_id: int):
    return db.query(models.URLMapping).filter(models.URLMapping.id == link_id).first()

def delete_link(db: Session, link):
    db.delete(link)
    db.commit()