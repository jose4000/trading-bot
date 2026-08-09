type TBrandLogoProps = {
    width?: number;
    height?: number;
    fill?: string;
    className?: string;
};

export const BrandLogo = ({ width = 120, height = 32, className = '' }: TBrandLogoProps) => {
    return (
        <img
            src='/voltra-logo.svg'
            alt='Voltra'
            width={width}
            height={height}
            className={className}
        />
    );
};