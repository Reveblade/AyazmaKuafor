import { useTranslation } from 'react-i18next';
import { Container, Section } from '@/components/ui/Section';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { galleryImages } from '@/data/images';

export function GalleryPage() {
  const { t } = useTranslation();

  return (
    <Section>
      <Container>
        <h1 className="font-display text-4xl md:text-5xl uppercase">{t('gallery.title')}</h1>
        <p className="mt-4 text-text-muted max-w-2xl">{t('gallery.subtitle')}</p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((img, i) => (
            <div key={i} className="aspect-[4/3] overflow-hidden border border-border rounded-sm group">
              <OptimizedImage
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
