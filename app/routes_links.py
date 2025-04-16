from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import schemas, crud
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/links", tags=["links"])

@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    link = crud.get_link_by_id(db, link_id)
    if not link or link.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Link not found")
    crud.delete_link(db, link)
    return