function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-img skeleton-animate" />
      <div className="skeleton-body">
        <div className="skeleton-line skeleton-animate" style={{ width: '70%', marginBottom: '12px' }} />
        <div className="skeleton-line skeleton-animate" style={{ width: '45%', height: '10px', marginBottom: '14px' }} />
        <div className="skeleton-line skeleton-animate" style={{ width: '55%', height: '22px', marginBottom: '14px' }} />
        <div className="skeleton-line skeleton-animate" style={{ width: '40%', height: '10px', marginBottom: '18px' }} />
        <div className="skeleton-line skeleton-animate" style={{ height: '36px', borderRadius: '50px' }} />
      </div>
    </div>
  );
}

export default SkeletonCard;
